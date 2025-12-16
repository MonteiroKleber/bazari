/**
 * React + TypeScript Template
 * Template basico com React 18, TypeScript e Vite
 */

import type { Template } from '../../types/studio.types';

export const REACT_TS_TEMPLATE: Template = {
  id: 'react-ts',
  name: 'React + TypeScript',
  description: 'Template basico com React 18, TypeScript e Vite. Inclui SDK Bazari configurado.',
  category: 'starter',
  icon: 'FileCode',
  color: '#3B82F6',
  tags: ['react', 'typescript', 'vite', 'starter'],
  sdkFeatures: ['auth', 'wallet', 'ui'],
  defaultPermissions: [
    { id: 'auth:read', reason: 'Para exibir seu perfil' },
    { id: 'wallet:read', reason: 'Para exibir seu saldo' },
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
  "type": "module",
  "description": "{{description}}",
  "author": "{{author}}",
  "scripts": {
    "dev": "vite --port 3333 --host",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@bazari.libervia.xyz/app-sdk": "^0.2.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
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
  "category": "tools",
  "permissions": [
    { "id": "auth:read", "reason": "Para exibir seu perfil" },
    { "id": "wallet:read", "reason": "Para exibir seu saldo" },
    { "id": "ui:toast", "reason": "Para exibir notificações" }
  ],
  "sdkVersion": "0.2.0",
  "entryPoint": "dist/index.html",
  "icon": "Package",
  "color": "from-blue-500 to-purple-600"
}`,
    },
    {
      path: 'index.html',
      isTemplate: true,
      content: `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{name}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.tsx"></script>
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
  server: {
    port: 3333,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
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
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,
    },
    {
      path: 'tsconfig.node.json',
      isTemplate: false,
      content: `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`,
    },
    {
      path: 'src/main.tsx',
      isTemplate: false,
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    },
    {
      path: 'src/App.tsx',
      isTemplate: true,
      content: `import { useBazari } from './hooks/useBazari';
import { UserCard } from './components/UserCard';

function App() {
  const { sdk, user, balance, isLoading, error, isInBazari } = useBazari();

  const handleShowToast = async () => {
    if (sdk && isInBazari) {
      await sdk.ui.success('Hello from {{name}}!');
    } else {
      alert('Toast: Hello from {{name}}!');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">{{name}}</h1>
        <p className="app-description">{{description}}</p>
      </header>

      {isLoading ? (
        <div className="loading">
          <div className="loading-spinner" />
          <p>Carregando...</p>
        </div>
      ) : error ? (
        <div className="error-card">
          <div className="error-title">Erro</div>
          <div className="error-text">{error}</div>
        </div>
      ) : !isInBazari ? (
        <div className="warning-card">
          <div className="warning-icon">&#9888;</div>
          <div className="warning-title">Modo de Desenvolvimento</div>
          <div className="warning-text">
            Este app deve rodar dentro do Bazari para funcionar.
            Use o Preview Mode no Developer Portal.
          </div>
        </div>
      ) : user ? (
        <>
          <UserCard user={user} balance={balance} />
          <div className="actions">
            <button className="btn btn-primary" onClick={handleShowToast}>
              Mostrar Toast
            </button>
          </div>
        </>
      ) : (
        <div className="not-connected">
          <h3>Usuario nao conectado</h3>
          <p>Conecte sua carteira para usar o app</p>
        </div>
      )}
    </div>
  );
}

export default App;`,
    },
    {
      path: 'src/hooks/useBazari.ts',
      isTemplate: false,
      content: `import { useState, useEffect, useCallback } from 'react';
import { BazariSDK, SDKUser } from '@bazari.libervia.xyz/app-sdk';

interface UseBazariReturn {
  sdk: BazariSDK | null;
  user: SDKUser | null;
  balance: string;
  isLoading: boolean;
  error: string | null;
  isInBazari: boolean;
  refetch: () => Promise<void>;
}

export function useBazari(): UseBazariReturn {
  const [sdk, setSdk] = useState<BazariSDK | null>(null);
  const [user, setUser] = useState<SDKUser | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInBazari, setIsInBazari] = useState(false);

  const fetchData = useCallback(async (sdkInstance: BazariSDK) => {
    try {
      const currentUser = await sdkInstance.auth.getCurrentUser();
      setUser(currentUser);

      if (currentUser?.id) {
        const balances = await sdkInstance.wallet.getBalance();
        if (balances) {
          setBalance(balances.formatted?.bzr || balances.bzr || '0');
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const refetch = useCallback(async () => {
    if (sdk && isInBazari) {
      setIsLoading(true);
      await fetchData(sdk);
      setIsLoading(false);
    }
  }, [sdk, isInBazari, fetchData]);

  useEffect(() => {
    const initSDK = async () => {
      try {
        const sdkInstance = new BazariSDK({ debug: true });
        setSdk(sdkInstance);

        const inBazari = sdkInstance.isInBazari();
        setIsInBazari(inBazari);

        if (inBazari) {
          await fetchData(sdkInstance);
        }
      } catch (err) {
        console.error('SDK initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize SDK');
      } finally {
        setIsLoading(false);
      }
    };

    initSDK();
  }, [fetchData]);

  return { sdk, user, balance, isLoading, error, isInBazari, refetch };
}`,
    },
    {
      path: 'src/components/UserCard.tsx',
      isTemplate: false,
      content: `interface UserCardProps {
  user: {
    displayName?: string;
    handle?: string;
    avatar?: string;
  };
  balance: string;
}

export function UserCard({ user, balance }: UserCardProps) {
  const displayName = user.displayName || user.handle || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const formatBalance = (bal: string) => {
    const num = parseFloat(bal);
    if (isNaN(num)) return '0';
    if (num >= 1000000) return \`\${(num / 1000000).toFixed(2)}M\`;
    if (num >= 1000) return \`\${(num / 1000).toFixed(2)}K\`;
    return num.toFixed(2);
  };

  return (
    <div className="user-card">
      <div className="user-info">
        {user.avatar ? (
          <img src={user.avatar} alt={displayName} className="user-avatar" />
        ) : (
          <div className="user-avatar">{initial}</div>
        )}
        <div className="user-details">
          <h3>{displayName}</h3>
          {user.handle && <span className="user-handle">@{user.handle}</span>}
        </div>
      </div>
      <div className="balance-section">
        <div className="balance-label">Saldo</div>
        <div className="balance-value">
          {formatBalance(balance)}
          <span className="balance-currency">BZR</span>
        </div>
      </div>
    </div>
  );
}`,
    },
    {
      path: 'src/index.css',
      isTemplate: false,
      content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: #333;
}

#root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.app-container {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.app-header {
  text-align: center;
  margin-bottom: 24px;
}

.app-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.app-description {
  color: #666;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.user-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: 700;
}

.user-details h3 {
  font-size: 18px;
  color: #1a1a2e;
  margin-bottom: 4px;
}

.user-handle {
  font-size: 12px;
  color: #666;
}

.balance-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ddd;
}

.balance-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
}

.balance-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
}

.balance-currency {
  font-size: 14px;
  color: #666;
  margin-left: 4px;
}

.actions {
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.warning-card {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.warning-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.warning-title {
  font-size: 18px;
  font-weight: 600;
  color: #856404;
  margin-bottom: 8px;
}

.warning-text {
  font-size: 14px;
  color: #856404;
}

.error-card {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.error-title {
  font-size: 16px;
  font-weight: 600;
  color: #721c24;
  margin-bottom: 8px;
}

.error-text {
  font-size: 14px;
  color: #721c24;
}

.not-connected {
  text-align: center;
  padding: 20px;
}

.not-connected h3 {
  font-size: 18px;
  color: #333;
  margin-bottom: 8px;
}

.not-connected p {
  font-size: 14px;
  color: #666;
}`,
    },
    {
      path: '.gitignore',
      isTemplate: false,
      content: `node_modules/
dist/
.env
.bazari/
*.log
.DS_Store`,
    },
  ],
};
