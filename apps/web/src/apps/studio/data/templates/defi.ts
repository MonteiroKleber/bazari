/**
 * DeFi Dashboard Template
 * Financial dashboard with token swaps, staking, and portfolio tracking
 */

import type { Template } from '../../types/studio.types';

export const defiTemplate: Template = {
  id: 'defi',
  name: 'DeFi Dashboard',
  description: 'Financial dashboard with token swaps, staking, and portfolio management',
  category: 'finance',
  icon: 'LineChart',
  color: '#10B981',
  tags: ['defi', 'finance', 'swap', 'staking', 'portfolio'],
  sdkFeatures: ['wallet', 'tokens', 'contracts'],
  defaultPermissions: [
    { id: 'auth:read', reason: 'Para identificar o usuário' },
    { id: 'wallet:read', reason: 'Para exibir saldo e transações' },
    { id: 'wallet:transfer', reason: 'Para executar swaps e staking' },
    { id: 'contracts:read', reason: 'Para consultar contratos DeFi' },
    { id: 'ui:toast', reason: 'Para exibir notificações' },
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
  "appId": "com.bazari.{{slug}}",
  "name": "{{name}}",
  "slug": "{{slug}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "author": "{{author}}",
  "category": "finance",
  "permissions": [
    { "id": "auth:read", "reason": "Para identificar o usuário" },
    { "id": "wallet:read", "reason": "Para exibir saldo e transações" },
    { "id": "wallet:transfer", "reason": "Para executar swaps e staking" },
    { "id": "contracts:read", "reason": "Para consultar contratos DeFi" },
    { "id": "ui:toast", "reason": "Para exibir notificações" }
  ],
  "sdkVersion": "0.2.0",
  "entryPoint": "dist/index.html",
  "icon": "LineChart",
  "color": "from-emerald-500 to-green-600"
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
  base: './',
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
import { usePortfolio } from './hooks/usePortfolio';
import { Header } from './components/Header';
import { PortfolioCard } from './components/PortfolioCard';
import { TokenList } from './components/TokenList';
import { SwapCard } from './components/SwapCard';
import { StakingCard } from './components/StakingCard';

type Tab = 'portfolio' | 'swap' | 'stake';

function App() {
  const { user, isConnected } = useBazari();
  const { portfolio, loading } = usePortfolio();
  const [activeTab, setActiveTab] = useState<Tab>('portfolio');

  if (!isConnected) {
    return (
      <div className="app">
        <div className="connect-screen">
          <div className="connect-content">
            <div className="logo-large">📊</div>
            <h1>{{name}}</h1>
            <p>Connect your wallet to access DeFi features</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header user={user} portfolio={portfolio} />

      <nav className="tabs">
        <button
          className={\`tab \${activeTab === 'portfolio' ? 'active' : ''}\`}
          onClick={() => setActiveTab('portfolio')}
        >
          Portfolio
        </button>
        <button
          className={\`tab \${activeTab === 'swap' ? 'active' : ''}\`}
          onClick={() => setActiveTab('swap')}
        >
          Swap
        </button>
        <button
          className={\`tab \${activeTab === 'stake' ? 'active' : ''}\`}
          onClick={() => setActiveTab('stake')}
        >
          Stake
        </button>
      </nav>

      <main className="main">
        {activeTab === 'portfolio' && (
          <div className="portfolio-view">
            <PortfolioCard portfolio={portfolio} loading={loading} />
            <TokenList tokens={portfolio?.tokens || []} />
          </div>
        )}

        {activeTab === 'swap' && <SwapCard />}

        {activeTab === 'stake' && <StakingCard />}
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
      path: 'src/hooks/usePortfolio.ts',
      isTemplate: false,
      content: `import { useState, useEffect } from 'react';

export interface Token {
  symbol: string;
  name: string;
  balance: number;
  price: number;
  change24h: number;
  icon?: string;
}

export interface Portfolio {
  totalValue: number;
  change24h: number;
  changePercent: number;
  tokens: Token[];
}

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated portfolio data
    const mockPortfolio: Portfolio = {
      totalValue: 12847.53,
      change24h: 342.18,
      changePercent: 2.73,
      tokens: [
        {
          symbol: 'BZR',
          name: 'Bazari',
          balance: 5000,
          price: 1.25,
          change24h: 3.2,
        },
        {
          symbol: 'ZARI',
          name: 'Zari Token',
          balance: 2500,
          price: 0.85,
          change24h: -1.5,
        },
        {
          symbol: 'DOT',
          name: 'Polkadot',
          balance: 150,
          price: 7.42,
          change24h: 4.1,
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          balance: 0.75,
          price: 3245.00,
          change24h: 2.8,
        },
      ],
    };

    setTimeout(() => {
      setPortfolio(mockPortfolio);
      setLoading(false);
    }, 800);
  }, []);

  return { portfolio, loading };
}`,
    },
    {
      path: 'src/components/Header.tsx',
      isTemplate: true,
      content: `import type { Portfolio } from '../hooks/usePortfolio';
import type { SDKUser } from '@bazari.libervia.xyz/app-sdk';

interface HeaderProps {
  user: SDKUser | null;
  portfolio: Portfolio | null;
}

export function Header({ user, portfolio }: HeaderProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="logo">{{name}}</h1>
      </div>

      <div className="header-right">
        {portfolio && (
          <div className="header-balance">
            <span className="balance-label">Portfolio</span>
            <span className="balance-value">{formatCurrency(portfolio.totalValue)}</span>
          </div>
        )}

        {user && (
          <div className="wallet-badge">
            <span className="wallet-icon">👛</span>
            <span className="wallet-address">{user.displayName || user.handle}</span>
          </div>
        )}
      </div>
    </header>
  );
}`,
    },
    {
      path: 'src/components/PortfolioCard.tsx',
      isTemplate: false,
      content: `import type { Portfolio } from '../hooks/usePortfolio';

interface PortfolioCardProps {
  portfolio: Portfolio | null;
  loading: boolean;
}

export function PortfolioCard({ portfolio, loading }: PortfolioCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="card portfolio-card loading">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-value"></div>
      </div>
    );
  }

  if (!portfolio) return null;

  const isPositive = portfolio.change24h >= 0;

  return (
    <div className="card portfolio-card">
      <h2 className="card-title">Total Balance</h2>
      <div className="portfolio-value">{formatCurrency(portfolio.totalValue)}</div>
      <div className={\`portfolio-change \${isPositive ? 'positive' : 'negative'}\`}>
        <span className="change-icon">{isPositive ? '↑' : '↓'}</span>
        <span>{formatCurrency(Math.abs(portfolio.change24h))}</span>
        <span className="change-percent">({portfolio.changePercent.toFixed(2)}%)</span>
        <span className="change-period">24h</span>
      </div>
    </div>
  );
}`,
    },
    {
      path: 'src/components/TokenList.tsx',
      isTemplate: false,
      content: `import type { Token } from '../hooks/usePortfolio';

interface TokenListProps {
  tokens: Token[];
}

export function TokenList({ tokens }: TokenListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 4,
    }).format(value);
  };

  return (
    <div className="card token-list">
      <h2 className="card-title">Assets</h2>
      <div className="tokens">
        {tokens.map((token) => {
          const value = token.balance * token.price;
          const isPositive = token.change24h >= 0;

          return (
            <div key={token.symbol} className="token-row">
              <div className="token-info">
                <div className="token-icon">{token.symbol.charAt(0)}</div>
                <div className="token-details">
                  <span className="token-symbol">{token.symbol}</span>
                  <span className="token-name">{token.name}</span>
                </div>
              </div>
              <div className="token-balance">
                <span className="balance-amount">{formatNumber(token.balance)}</span>
                <span className="balance-value">{formatCurrency(value)}</span>
              </div>
              <div className={\`token-change \${isPositive ? 'positive' : 'negative'}\`}>
                {isPositive ? '+' : ''}{token.change24h.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}`,
    },
    {
      path: 'src/components/SwapCard.tsx',
      isTemplate: false,
      content: `import { useState } from 'react';

interface SwapToken {
  symbol: string;
  balance: number;
}

const tokens: SwapToken[] = [
  { symbol: 'BZR', balance: 5000 },
  { symbol: 'ZARI', balance: 2500 },
  { symbol: 'DOT', balance: 150 },
];

export function SwapCard() {
  const [fromToken, setFromToken] = useState('BZR');
  const [toToken, setToToken] = useState('ZARI');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  const handleFromChange = (value: string) => {
    setFromAmount(value);
    // Simulated conversion rate
    const rate = fromToken === 'BZR' ? 1.47 : 0.68;
    setToAmount(value ? (parseFloat(value) * rate).toFixed(4) : '');
  };

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount('');
    setToAmount('');
  };

  return (
    <div className="card swap-card">
      <h2 className="card-title">Swap Tokens</h2>

      <div className="swap-form">
        {/* From */}
        <div className="swap-input-group">
          <label>From</label>
          <div className="swap-input">
            <select value={fromToken} onChange={(e) => setFromToken(e.target.value)}>
              {tokens.map((t) => (
                <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="0.00"
              value={fromAmount}
              onChange={(e) => handleFromChange(e.target.value)}
            />
          </div>
          <span className="balance-hint">
            Balance: {tokens.find((t) => t.symbol === fromToken)?.balance || 0}
          </span>
        </div>

        {/* Swap button */}
        <button className="swap-toggle" onClick={handleSwapTokens}>
          ⇅
        </button>

        {/* To */}
        <div className="swap-input-group">
          <label>To</label>
          <div className="swap-input">
            <select value={toToken} onChange={(e) => setToToken(e.target.value)}>
              {tokens.map((t) => (
                <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="0.00"
              value={toAmount}
              readOnly
            />
          </div>
        </div>

        {/* Rate */}
        {fromAmount && (
          <div className="swap-rate">
            1 {fromToken} ≈ {fromToken === 'BZR' ? '1.47' : '0.68'} {toToken}
          </div>
        )}

        <button className="btn-swap" disabled={!fromAmount || parseFloat(fromAmount) <= 0}>
          Swap
        </button>
      </div>
    </div>
  );
}`,
    },
    {
      path: 'src/components/StakingCard.tsx',
      isTemplate: false,
      content: `import { useState } from 'react';

interface StakingPool {
  id: string;
  name: string;
  token: string;
  apy: number;
  tvl: number;
  staked: number;
}

const pools: StakingPool[] = [
  { id: '1', name: 'BZR Staking', token: 'BZR', apy: 12.5, tvl: 2500000, staked: 1000 },
  { id: '2', name: 'ZARI Pool', token: 'ZARI', apy: 8.2, tvl: 1200000, staked: 500 },
  { id: '3', name: 'LP Farming', token: 'BZR-ZARI', apy: 24.8, tvl: 800000, staked: 0 },
];

export function StakingCard() {
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return \`$\${(value / 1000000).toFixed(2)}M\`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="staking-view">
      <div className="card staking-card">
        <h2 className="card-title">Staking Pools</h2>

        <div className="pools-list">
          {pools.map((pool) => (
            <div
              key={pool.id}
              className={\`pool-item \${selectedPool === pool.id ? 'selected' : ''}\`}
              onClick={() => setSelectedPool(pool.id)}
            >
              <div className="pool-info">
                <div className="pool-icon">{pool.token.charAt(0)}</div>
                <div className="pool-details">
                  <span className="pool-name">{pool.name}</span>
                  <span className="pool-tvl">TVL: {formatCurrency(pool.tvl)}</span>
                </div>
              </div>
              <div className="pool-apy">
                <span className="apy-value">{pool.apy}%</span>
                <span className="apy-label">APY</span>
              </div>
              {pool.staked > 0 && (
                <div className="pool-staked">
                  <span className="staked-value">{pool.staked}</span>
                  <span className="staked-label">Staked</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedPool && (
        <div className="card stake-action-card">
          <h3>Stake {pools.find((p) => p.id === selectedPool)?.token}</h3>
          <div className="stake-input-group">
            <input
              type="number"
              placeholder="Amount to stake"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
            />
            <button className="btn-max">MAX</button>
          </div>
          <div className="stake-actions">
            <button className="btn-stake">Stake</button>
            <button className="btn-unstake">Unstake</button>
          </div>
        </div>
      )}
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
  --primary: #10B981;
  --primary-dark: #059669;
  --bg: #0A0A0A;
  --bg-card: #141414;
  --bg-hover: #1F1F1F;
  --text: #FFFFFF;
  --text-secondary: #9CA3AF;
  --border: #262626;
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

.logo-large {
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
  gap: 2rem;
}

.header-balance {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.balance-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.balance-value {
  font-size: 1.125rem;
  font-weight: 600;
}

.wallet-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-hover);
  border-radius: 8px;
}

.wallet-icon {
  font-size: 1.25rem;
}

.wallet-address {
  font-family: monospace;
  font-size: 0.875rem;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.25rem;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}

.tab {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.tab.active {
  background: var(--primary);
  color: white;
}

/* Main */
.main {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

/* Cards */
.card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border);
}

.card-title {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

/* Portfolio Card */
.portfolio-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.portfolio-card {
  text-align: center;
}

.portfolio-value {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.portfolio-change {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.portfolio-change.positive {
  color: var(--positive);
}

.portfolio-change.negative {
  color: var(--negative);
}

.change-period {
  color: var(--text-secondary);
  margin-left: 0.25rem;
}

/* Token List */
.tokens {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.token-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--bg);
  border-radius: 12px;
  transition: background 0.2s;
}

.token-row:hover {
  background: var(--bg-hover);
}

.token-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.token-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
}

.token-details {
  display: flex;
  flex-direction: column;
}

.token-symbol {
  font-weight: 600;
}

.token-name {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.token-balance {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.balance-amount {
  font-weight: 500;
}

.balance-value {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.token-change {
  font-weight: 500;
  min-width: 80px;
  text-align: right;
}

.token-change.positive {
  color: var(--positive);
}

.token-change.negative {
  color: var(--negative);
}

/* Swap Card */
.swap-card {
  max-width: 450px;
  margin: 0 auto;
}

.swap-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.swap-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.swap-input-group label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.swap-input {
  display: flex;
  background: var(--bg);
  border-radius: 12px;
  overflow: hidden;
}

.swap-input select {
  background: var(--bg-hover);
  border: none;
  color: var(--text);
  padding: 1rem;
  font-size: 1rem;
  cursor: pointer;
  min-width: 100px;
}

.swap-input input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text);
  padding: 1rem;
  font-size: 1.25rem;
  text-align: right;
}

.swap-input input:focus {
  outline: none;
}

.balance-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.swap-toggle {
  align-self: center;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.swap-toggle:hover {
  background: var(--primary);
  border-color: var(--primary);
}

.swap-rate {
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
  padding: 0.75rem;
  background: var(--bg);
  border-radius: 8px;
}

.btn-swap {
  background: var(--primary);
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 12px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-swap:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-swap:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Staking */
.staking-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.pools-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pool-item {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem;
  background: var(--bg);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.pool-item:hover {
  background: var(--bg-hover);
}

.pool-item.selected {
  border-color: var(--primary);
}

.pool-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.pool-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  font-size: 1.125rem;
}

.pool-details {
  display: flex;
  flex-direction: column;
}

.pool-name {
  font-weight: 600;
}

.pool-tvl {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.pool-apy,
.pool-staked {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.apy-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--positive);
}

.apy-label,
.staked-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.staked-value {
  font-weight: 600;
}

/* Stake Action */
.stake-action-card h3 {
  margin-bottom: 1rem;
}

.stake-input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.stake-input-group input {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: var(--text);
  font-size: 1rem;
}

.stake-input-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.btn-max {
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-max:hover {
  background: var(--primary);
  border-color: var(--primary);
}

.stake-actions {
  display: flex;
  gap: 1rem;
}

.btn-stake,
.btn-unstake {
  flex: 1;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-stake {
  background: var(--primary);
  border: none;
  color: white;
}

.btn-stake:hover {
  background: var(--primary-dark);
}

.btn-unstake {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-unstake:hover {
  background: var(--bg-hover);
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
  width: 100px;
  margin-bottom: 1rem;
}

.skeleton-value {
  height: 3rem;
  width: 200px;
  margin: 0 auto;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`,
    },
  ],
};
